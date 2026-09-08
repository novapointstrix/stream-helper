// src/services/wheelHistoryService.ts
import { supabase } from '../lib/supabaseClient'
import type { SpinRecord } from '../types/wheel.types'

export const wheelHistoryService = {
    /**
     * Загрузка последних прокрутов
     */
    async getHistory(limit = 50): Promise<SpinRecord[]> {
        const { data, error } = await supabase
            .from('wheel_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Ошибка загрузки истории колеса:', error)
            return []
        }

        return data || []
    },

    /**
     * Сохранение результата нового вращения
     */
    async addRecord(record: Omit<SpinRecord, 'id' | 'created_at'>): Promise<SpinRecord | null> {
        const { data, error } = await supabase
            .from('wheel_history')
            .insert([record])
            .select()
            .single()

        if (error) {
            console.error('Ошибка сохранении прокрута:', error)
            return null
        }

        return data
    },

    /**
     * Удаление записи
     */
    async deleteRecord(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('wheel_history')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Ошибка удаления записи:', error)
            return false
        }

        return true
    }
}